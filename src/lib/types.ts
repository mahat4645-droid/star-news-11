/** Page-level SEO options every theme Layout accepts (passed on to components/Head.astro). */
export interface HeadProps {
  title?: string;
  description?: string;
  /** Root-relative or absolute URL of the social share image. */
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
  preconnectYouTube?: boolean;
}

export interface LayoutProps extends HeadProps {
  /** Which menu item is highlighted: 'home', 'latest', 'videos', 'webstories' or a category id. */
  activeNav?: string;
}
