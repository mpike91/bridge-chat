import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to chats or login based on auth state
  // This will be handled properly once auth is set up
  redirect("/chats");
}
