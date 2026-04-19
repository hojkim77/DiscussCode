import { db } from "@discusscode/db";
import type { Database } from "@discusscode/db";

type NotificationsInsert = Database["public"]["Tables"]["notifications"]["Insert"];

// Shared notification generator – called from comments route
export async function generateNotifications(params: {
  type: "reply" | "mention";
  talkId: string;
  commentId: string;
  authorId: string;
  bodyMd: string;
  parentId?: string;
}) {
  const { type, talkId, commentId, authorId, bodyMd, parentId } = params;

  // Get talk + commenter info
  const [talkRes, commenterRes] = await Promise.all([
    db.from("talks").select("title, author_id").eq("id", talkId).single(),
    db.from("users").select("handle, avatar").eq("id", authorId).single(),
  ]);

  if (!talkRes.data || !commenterRes.data) return;

  const notifyPayload = {
    talk_id: talkId,
    talk_title: talkRes.data.title,
    comment_id: commentId,
    commenter_handle: commenterRes.data.handle,
    commenter_avatar: commenterRes.data.avatar,
  };

  const notifications: NotificationsInsert[] = [];

  // Notify talk author (if different from commenter)
  if (talkRes.data.author_id && talkRes.data.author_id !== authorId) {
    notifications.push({
      user_id: talkRes.data.author_id,
      type: "reply" as const,
      payload: notifyPayload,
    });
  }

  // Notify parent comment author (if replying)
  if (parentId) {
    const { data: parent } = await db
      .from("comments")
      .select("author_id")
      .eq("id", parentId)
      .single();

    if (parent?.author_id && parent.author_id !== authorId && parent.author_id !== talkRes.data.author_id) {
      notifications.push({
        user_id: parent.author_id,
        type: "reply" as const,
        payload: notifyPayload,
      });
    }
  }

  // Parse @mentions from body
  const mentions = [...bodyMd.matchAll(/@([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
  if (mentions.length) {
    const { data: mentionedUsers } = await db
      .from("users")
      .select("id")
      .in("handle", mentions)
      .neq("id", authorId);

    for (const u of mentionedUsers ?? []) {
      if (!notifications.find((n) => n.user_id === u.id)) {
        notifications.push({
          user_id: u.id,
          type: "mention" as const,
          payload: { ...notifyPayload, mentioned_by: commenterRes.data.handle },
        });
      }
    }
  }

  if (notifications.length) {
    await db.from("notifications").insert(notifications);
  }
}
