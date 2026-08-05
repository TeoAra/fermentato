import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Hash, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PostContent } from "@/components/social/PostContent";
import TrendingHashtags from "@/components/social/TrendingHashtags";
import { MicroblogSocialBar } from "@/components/social/MicroblogSocialBar";

function PostAvatar({ post }: { post: any }) {
  const name = post.display_name ?? post.username ?? "?";
  return post.profile_image_url ? (
    <img loading="lazy" src={post.profile_image_url} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
      <span className="text-primary text-sm font-bold">{(name[0] ?? "?").toUpperCase()}</span>
    </div>
  );
}

export default function HashtagPage() {
  const params = useParams<{ tag: string }>();
  const tag = decodeURIComponent(params.tag || "").toLowerCase().replace(/^#/, "");

  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/microblog/posts", { hashtag: tag }],
    queryFn: () => fetch(`/api/microblog/posts?hashtag=${encodeURIComponent(tag)}&limit=50`, { credentials: "include" })
      .then(r => r.ok ? r.json() : []),
    enabled: !!tag,
  });

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] pb-20">
      <Helmet>
        <title>#{tag} · Post della community · Fermenta.to</title>
        <meta name="description" content={`Tutti i post taggati con #${tag} sulla community di Fermenta.to`} />
      </Helmet>

      <header className="sticky top-0 z-10 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border-b border-stone-100 dark:border-[#23262E] px-4 py-3 flex items-center gap-3">
        <Link href="/feed">
          <button className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-[#1A1D24]" data-testid="btn-back-feed">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold flex items-center gap-1.5 truncate">
            <Hash className="w-4 h-4 text-primary" />
            <span className="truncate">{tag}</span>
          </h1>
          <p className="text-[11px] text-stone-400">Post della community</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-3">
        {/* Trending hashtags strip */}
        <TrendingHashtags limit={10} compact />

        {isLoading ? (
          <>{[0, 1, 2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</>
        ) : posts.length === 0 ? (
          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-dashed border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-stone-300 mb-2" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Nessun post con <span className="font-semibold text-primary">#{tag}</span> per ora.
            </p>
            <Link href="/microblog/nuovo">
              <Button size="sm" className="mt-3 rounded-full">Scrivi il primo</Button>
            </Link>
          </div>
        ) : (
          posts.map((post: any) => (
            <div key={post.id} className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 p-4" data-testid={`hashtag-post-${post.id}`}>
              <div className="flex items-center gap-2 mb-2">
                <Link href={`/user/${post.username}`}><PostAvatar post={post} /></Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/user/${post.username}`}>
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">{post.display_name ?? post.username}</p>
                  </Link>
                  <p className="text-[11px] text-stone-400">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it })}
                  </p>
                </div>
              </div>
              <PostContent content={post.content} />
              {post.image_url && (
                <img src={post.image_url} alt="" className="mt-3 rounded-xl w-full max-h-96 object-cover" loading="lazy" />
              )}
              {(post.beer_name || post.pub_name || post.brewery_name) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {post.beer_name && (
                    <Link href={`/beer/${post.beer_id}`}>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold cursor-pointer">🍺 {post.beer_name}</span>
                    </Link>
                  )}
                  {post.pub_name && (
                    <Link href={`/pub/${post.pub_id}`}>
                      <span className="text-[10px] bg-stone-100 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full cursor-pointer">📍 {post.pub_name}</span>
                    </Link>
                  )}
                  {post.brewery_name && (
                    <Link href={`/brewery/${post.brewery_id}`}>
                      <span className="text-[10px] bg-stone-100 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full cursor-pointer">🏭 {post.brewery_name}</span>
                    </Link>
                  )}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-stone-100 dark:border-white/[0.06]">
                <MicroblogSocialBar
                  postId={post.id}
                  postUserId={post.user_id}
                  liked={post.liked ?? false}
                  likesCount={post.likes_count ?? 0}
                  commentsCount={post.comments_count ?? 0}
                  content={post.content ?? ""}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
