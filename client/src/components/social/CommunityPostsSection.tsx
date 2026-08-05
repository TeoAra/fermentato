import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Heart, MessageCircle, PenSquare, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { PostContent } from "./PostContent";
import { EntityPreviewCard, type EntityType } from "./EntityPreviewCard";

export type TaggedEntity =
  | { kind: "pub"; id: number; name: string }
  | { kind: "brewery"; id: number; name: string }
  | { kind: "beer"; id: number; name: string }
  | { kind: "event"; id: number; sourceType: "pub" | "brewery"; name: string };

function entityKey(e: TaggedEntity): string {
  return e.kind === "event" ? `event:${e.sourceType}:${e.id}` : `${e.kind}:${e.id}`;
}

function composerHref(e: TaggedEntity): string {
  const params = new URLSearchParams();
  if (e.kind === "pub") { params.set("pubId", String(e.id)); params.set("pubName", e.name); }
  else if (e.kind === "brewery") { params.set("breweryId", String(e.id)); params.set("breweryName", e.name); }
  else if (e.kind === "beer") { params.set("beerId", String(e.id)); params.set("beerName", e.name); }
  else if (e.kind === "event") {
    params.set("eventId", String(e.id));
    params.set("eventSourceType", e.sourceType);
    params.set("eventName", e.name);
  }
  return `/microblog/nuovo?${params.toString()}`;
}

function PostAvatar({ post, size = 8 }: { post: any; size?: number }) {
  const name = post.display_name ?? post.username ?? "?";
  const sz = `w-${size} h-${size}`;
  return post.profile_image_url ? (
    <img src={post.profile_image_url} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0`}>
      <span className="text-primary text-sm font-bold">{(name[0] ?? "?").toUpperCase()}</span>
    </div>
  );
}

function CommunityPostCard({ post }: { post: any }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [entityPreview, setEntityPreview] = useState<{
    type: "brewery" | "pub" | "beer"; id: number; rect: DOMRect;
  } | null>(null);

  const likeMut = useMutation({
    mutationFn: () => apiRequest(`/api/microblog/posts/${post.id}/like`, { method: post.liked ? "DELETE" : "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
    },
  });

  const handleEntityChip = (
    e: React.MouseEvent,
    type: "brewery" | "pub" | "beer",
    id: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEntityPreview({ type, id, rect });
  };

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-stone-100 dark:border-[#23262E] shadow-sm p-4" data-testid={`community-post-${post.id}`}>
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/user/${post.username}`}><PostAvatar post={post} size={9} /></Link>
        <div className="flex-1 min-w-0">
          <Link href={`/user/${post.username}`}>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">{post.display_name ?? post.username}</p>
          </Link>
          <p className="text-[11px] text-stone-400">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it })} · 📝 post
          </p>
        </div>
      </div>
      <PostContent content={post.content} />
      {post.image_url && (
        <img src={post.image_url} alt="" className="mt-3 rounded-xl w-full max-h-96 object-cover" loading="lazy" />
      )}
      {(post.beer_name || post.pub_name || post.brewery_name) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.beer_name && post.beer_id && (
            <button
              onClick={(e) => handleEntityChip(e, "beer", post.beer_id)}
              className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold cursor-pointer hover:bg-primary/20 transition-colors"
            >
              🍺 {post.beer_name}
            </button>
          )}
          {post.pub_name && post.pub_id && (
            <button
              onClick={(e) => handleEntityChip(e, "pub", post.pub_id)}
              className="text-[10px] bg-stone-100 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full cursor-pointer hover:bg-stone-200 dark:hover:bg-[#12151A] transition-colors"
            >
              📍 {post.pub_name}
            </button>
          )}
          {post.brewery_name && post.brewery_id && (
            <button
              onClick={(e) => handleEntityChip(e, "brewery", post.brewery_id)}
              className="text-[10px] bg-stone-100 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full cursor-pointer hover:bg-stone-200 dark:hover:bg-[#12151A] transition-colors"
            >
              🏭 {post.brewery_name}
            </button>
          )}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-stone-100 dark:border-[#23262E]/40 flex items-center gap-4">
        <button
          onClick={() => isAuthenticated && likeMut.mutate()}
          disabled={!isAuthenticated || likeMut.isPending}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${post.liked ? "text-red-500" : "text-stone-500 hover:text-red-500"} disabled:opacity-60`}
          data-testid={`post-like-${post.id}`}
        >
          <Heart className="w-4 h-4" fill={post.liked ? "currentColor" : "none"} />
          {post.likes_count ?? 0}
        </button>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
          <MessageCircle className="w-4 h-4" />
          {post.comments_count ?? 0}
        </span>
      </div>

      {entityPreview && (
        <EntityPreviewCard
          type={entityPreview.type}
          id={entityPreview.id}
          anchorRect={entityPreview.rect}
          onClose={() => setEntityPreview(null)}
        />
      )}
    </div>
  );
}

export interface CommunityPostsSectionProps {
  entity: TaggedEntity;
  title?: string;
  pageSize?: number;
}

export function CommunityPostsSection({ entity, title = "Post della community", pageSize = 10 }: CommunityPostsSectionProps) {
  const { isAuthenticated } = useAuth();
  const taggedEntity = entityKey(entity);

  const { data: posts = [], isLoading, isFetching } = useQuery<any[]>({
    queryKey: ["/api/microblog/posts", { taggedEntity, limit: pageSize }],
    queryFn: () =>
      fetch(`/api/microblog/posts?taggedEntity=${encodeURIComponent(taggedEntity)}&limit=${pageSize}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : []),
  });

  const composeUrl = composerHref(entity);
  const ctaLabel = entity.kind === "pub" ? "Scrivi un post su questo locale"
                : entity.kind === "brewery" ? "Scrivi un post su questo birrificio"
                : entity.kind === "beer" ? "Scrivi un post su questa birra"
                : "Scrivi un post su questo evento";

  return (
    <section className="mt-8 space-y-3" data-testid={`community-posts-${entity.kind}-${entity.id}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {title}
          {posts.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({posts.length}{posts.length >= pageSize ? "+" : ""})</span>
          )}
        </h2>
        {isAuthenticated ? (
          <Link href={composeUrl}>
            <Button size="sm" className="rounded-full gap-1.5 h-8 text-xs" data-testid={`btn-write-post-${entity.kind}`}>
              <PenSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ctaLabel}</span>
              <span className="sm:hidden">Scrivi un post</span>
            </Button>
          </Link>
        ) : (
          <Link href="/auth">
            <Button size="sm" variant="outline" className="rounded-full gap-1.5 h-8 text-xs">
              <PenSquare className="w-3.5 h-3.5" />
              Accedi per postare
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-dashed border-stone-200 dark:border-[#23262E] p-6 text-center">
          <Users className="w-8 h-8 mx-auto text-stone-300 mb-2" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Nessun post ancora. {isAuthenticated && "Sii il primo a parlarne!"}
          </p>
          {isAuthenticated && (
            <Link href={composeUrl}>
              <Button size="sm" variant="ghost" className="mt-2 text-primary">
                <PenSquare className="w-4 h-4 mr-1.5" /> Scrivi un post
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p: any) => <CommunityPostCard key={p.id} post={p} />)}
          {isFetching && posts.length >= pageSize && (
            <p className="text-center text-xs text-stone-400 py-2">Mostrando i {pageSize} più recenti</p>
          )}
        </div>
      )}
    </section>
  );
}
