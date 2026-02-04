-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sms_participants DISABLE ROW LEVEL SECURITY;



-- SELECT id, display_name, email FROM profiles;

-- SELECT id, name FROM groups;

INSERT INTO group_members (group_id, user_id, role)
VALUES (
  '9a404cb4-10e5-4325-890e-4f0ab7fd6025',
  '1439c1c7-df40-472c-ac40-a656e1ea8357',
  'member'
)





  -- MESSAGES REFRESH / CLEAN GROUPS:
  -- -- Delete messages first (references groups, profiles, sms_participants)
  -- DELETE FROM messages;
  -- -- Delete group_members (references groups, profiles, sms_participants)
  -- DELETE FROM group_members;
  -- -- Delete sms_participants (references profiles)
  -- DELETE FROM sms_participants;
  -- -- Delete groups (references profiles)
  -- DELETE FROM groups;