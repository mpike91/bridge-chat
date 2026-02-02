-- BridgeChat Initial Schema
-- Creates all tables, RLS policies, and triggers for the messaging system

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Message origin: where the message came from
create type message_origin as enum ('app', 'sms');

-- Delivery status for outbound SMS (maps to Twilio statuses)
create type delivery_status as enum (
  'pending',     -- Created, not yet sent to Twilio
  'queued',      -- Twilio accepted
  'sent',        -- Sent to carrier
  'delivered',   -- Carrier confirmed
  'failed',      -- Twilio couldn't send
  'undelivered'  -- Carrier rejected
);

-- Group member roles
create type group_member_role as enum ('owner', 'admin', 'member');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles: Extends auth.users with app-specific data
-- This table is created automatically when a user signs up via trigger
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  phone_number text, -- E.164 format, optional
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_phone_number_format
    check (phone_number is null or phone_number ~ '^\+[1-9]\d{7,14}$')
);

-- Index for looking up profiles by phone number
create index idx_profiles_phone_number on profiles(phone_number) where phone_number is not null;

-- SMS Participants: Phone-only participants added by app users
create table sms_participants (
  id uuid primary key default uuid_generate_v4(),
  phone_number text not null,
  display_name text not null,
  created_by_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sms_participants_phone_format
    check (phone_number ~ '^\+[1-9]\d{7,14}$')
);

-- Index for looking up SMS participants by phone
create index idx_sms_participants_phone on sms_participants(phone_number);
create index idx_sms_participants_creator on sms_participants(created_by_user_id);

-- Groups: Conversation containers with dedicated Twilio numbers
create table groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  twilio_phone_number text not null,
  created_by_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint groups_twilio_phone_format
    check (twilio_phone_number ~ '^\+[1-9]\d{7,14}$')
);

-- Index for looking up group by Twilio number (critical for webhook routing)
create unique index idx_groups_twilio_phone on groups(twilio_phone_number);
create index idx_groups_creator on groups(created_by_user_id);

-- Group Members: Junction table with polymorphic member reference
-- Either user_id OR sms_participant_id must be set, never both
create table group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  sms_participant_id uuid references sms_participants(id) on delete cascade,
  role group_member_role not null default 'member',
  joined_at timestamptz not null default now(),

  -- Polymorphic constraint: exactly one of user_id or sms_participant_id
  constraint chk_member_type check (
    (user_id is not null and sms_participant_id is null) or
    (user_id is null and sms_participant_id is not null)
  )
);

-- Unique constraints to prevent duplicate memberships
create unique index idx_group_members_user
  on group_members(group_id, user_id) where user_id is not null;
create unique index idx_group_members_sms
  on group_members(group_id, sms_participant_id) where sms_participant_id is not null;

-- Indexes for membership lookups
create index idx_group_members_group on group_members(group_id);
create index idx_group_members_user_id on group_members(user_id) where user_id is not null;
create index idx_group_members_sms_id on group_members(sms_participant_id) where sms_participant_id is not null;

-- Messages: Unified message table with origin-based polymorphism
create table messages (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references groups(id) on delete cascade,
  origin message_origin not null,
  content text not null,

  -- Polymorphic sender: depends on origin
  sender_user_id uuid references profiles(id) on delete set null,
  sender_sms_participant_id uuid references sms_participants(id) on delete set null,

  -- SMS tracking fields
  twilio_message_sid text,
  delivery_status delivery_status,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Sender must match origin type
  constraint chk_sender_type check (
    (origin = 'app' and sender_user_id is not null and sender_sms_participant_id is null) or
    (origin = 'sms' and sender_user_id is null and sender_sms_participant_id is not null)
  ),

  -- SMS origin messages must have Twilio SID
  constraint chk_sms_has_sid check (
    origin = 'app' or twilio_message_sid is not null
  )
);

-- Indexes for message queries
create index idx_messages_group on messages(group_id);
create index idx_messages_group_created on messages(group_id, created_at desc);
create index idx_messages_sender_user on messages(sender_user_id) where sender_user_id is not null;
create index idx_messages_sender_sms on messages(sender_sms_participant_id) where sender_sms_participant_id is not null;
create index idx_messages_twilio_sid on messages(twilio_message_sid) where twilio_message_sid is not null;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Function to create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Function to check if user is member of a group
create or replace function is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = p_user_id
  );
end;
$$ language plpgsql security definer;

-- Function to get user's role in a group
create or replace function get_group_role(p_group_id uuid, p_user_id uuid)
returns group_member_role as $$
declare
  v_role group_member_role;
begin
  select role into v_role
  from group_members
  where group_id = p_group_id and user_id = p_user_id;
  return v_role;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers for all tables
create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();

create trigger set_sms_participants_updated_at
  before update on sms_participants
  for each row execute function update_updated_at_column();

create trigger set_groups_updated_at
  before update on groups
  for each row execute function update_updated_at_column();

create trigger set_messages_updated_at
  before update on messages
  for each row execute function update_updated_at_column();

-- Create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table sms_participants enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table messages enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can view profiles of group members"
  on profiles for select
  using (
    exists (
      select 1 from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = profiles.id
    )
  );

-- SMS Participants policies
create policy "Users can view SMS participants they created"
  on sms_participants for select
  using (created_by_user_id = auth.uid());

create policy "Users can view SMS participants in their groups"
  on sms_participants for select
  using (
    exists (
      select 1 from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
        and gm2.sms_participant_id = sms_participants.id
    )
  );

create policy "Users can create SMS participants"
  on sms_participants for insert
  with check (created_by_user_id = auth.uid());

create policy "Users can update SMS participants they created"
  on sms_participants for update
  using (created_by_user_id = auth.uid());

create policy "Users can delete SMS participants they created"
  on sms_participants for delete
  using (created_by_user_id = auth.uid());

-- Groups policies
create policy "Users can view groups they are members of"
  on groups for select
  using (is_group_member(id, auth.uid()));

create policy "Users can create groups"
  on groups for insert
  with check (created_by_user_id = auth.uid());

create policy "Group owners and admins can update group"
  on groups for update
  using (get_group_role(id, auth.uid()) in ('owner', 'admin'));

create policy "Group owners can delete group"
  on groups for delete
  using (get_group_role(id, auth.uid()) = 'owner');

-- Group Members policies
create policy "Users can view members of their groups"
  on group_members for select
  using (is_group_member(group_id, auth.uid()));

create policy "Group owners and admins can add members"
  on group_members for insert
  with check (
    get_group_role(group_id, auth.uid()) in ('owner', 'admin')
    or (user_id = auth.uid() and role = 'member')
  );

create policy "Group owners and admins can remove members"
  on group_members for delete
  using (
    get_group_role(group_id, auth.uid()) in ('owner', 'admin')
    or user_id = auth.uid()
  );

create policy "Group owners can update member roles"
  on group_members for update
  using (get_group_role(group_id, auth.uid()) = 'owner');

-- Messages policies
create policy "Users can view messages in their groups"
  on messages for select
  using (is_group_member(group_id, auth.uid()));

create policy "Users can send messages to their groups"
  on messages for insert
  with check (
    is_group_member(group_id, auth.uid())
    and origin = 'app'
    and sender_user_id = auth.uid()
  );

-- Note: SMS messages are inserted via service role (bypasses RLS)
-- Status updates also use service role

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for messages table
alter publication supabase_realtime add table messages;
