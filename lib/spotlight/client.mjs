// UI affordance only. PostgreSQL independently authorizes every removal.
export function canRemoveSpotlightPost({ user, accessRole, permissions, profileLoading }, post) {
  if (!user?.id || !post?.id) return false;
  if (post.user_id === user.id) return true;
  if (profileLoading) return false;
  return accessRole === 'super_admin' || permissions?.includes('spotlight.manage') === true;
}

export async function removeSpotlightPost(client, postId) {
  const { data, error } = await client.rpc('remove_spotlight_post', { post_id: postId });
  if (error) throw new Error(error.message || 'Could not remove spotlight post.');
  if (data !== postId) {
    throw new Error('Could not confirm removal. Refresh the wall and try again.');
  }
  return data;
}

// If a mutation overtakes a feed request, finish with a fresh response instead
// of restoring a removed row or abandoning the initial loading state.
export async function loadSpotlightPosts(client, getRevision) {
  while (true) {
    const revision = getRevision();
    const result = await client
      .from('spotlight_posts')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (revision === getRevision()) return result;
  }
}
