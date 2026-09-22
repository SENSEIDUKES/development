import { MotionPicture } from '@seihouse/sen/motion-picture';

export interface StoryCardDemoProps {
  title: string;
  author: string;
  genre: string;
  chapters: number;
  stage: string;
  coverUrl: string;
  videoUrl?: string;
}

/**
 * One story card carrying the Motion Picture ability, so the component can be
 * judged on a real card rather than a bare frame. Workshop-owned: the shipped
 * card families live in their own features, and this only shows the ability in
 * place. A Familiar card and other item types follow the same shape.
 */
export function StoryCardDemo({ title, author, genre, chapters, stage, coverUrl, videoUrl }: StoryCardDemoProps) {
  return <article className="story-card-demo">
    <MotionPicture className="story-card-demo-cover" stillUrl={coverUrl} videoUrl={videoUrl} alt={`${title} cover`}>
      <span className="story-card-demo-chapters">{chapters} CH</span>
    </MotionPicture>
    <div className="story-card-demo-body">
      <h4>{title}</h4>
      <p className="story-card-demo-author">{author}</p>
      <div className="story-card-demo-meta">
        <span className="story-card-demo-tag">{genre}</span>
        <span className="story-card-demo-stage">{stage}</span>
      </div>
    </div>
  </article>;
}
