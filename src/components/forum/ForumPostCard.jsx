import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
export default function ForumPostCard({
  post,
  onClick
}) {
  return <article className="rounded-xl border p-4 space-y-2">
      <div className="flex gap-2 items-center">
        <Badge variant="outline">{post.category || 'General'}</Badge>
        {post.is_pinned && <Badge>Pinned</Badge>}
      </div>
      <Button variant="link" onClick={onClick} className="p-0 h-auto text-left whitespace-normal">
        {post.title || 'Open discussion'}
      </Button>
      <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
      <p className="text-xs text-muted-foreground">{post.author_name || 'Community member'}</p>
    </article>;
}
