/**
 * A theme built on the shared engine is a combination of these design choices,
 * plus colours and fonts in its theme.css. See src/themes/<name>/config.ts.
 */
export interface ThemeConfig {
  /** Default brand colour — used when Site settings has no brand colour. */
  accent: string;
  /** 'dark' themes open in dark mode (readers can still switch). */
  mode?: 'auto' | 'dark';
  /** Thin strip above the header (date, social icons). */
  topbar: 'dark' | 'brand' | 'light' | 'none';
  /** left: logo left + search bar · center: centred masthead · compact: slim header with a search icon */
  header: 'left' | 'center' | 'compact';
  /** Main menu bar. */
  nav: 'solid' | 'dark' | 'light' | 'pill';
  /**
   * Top-stories layout.
   * grid: big story + 2×2 photo tiles · stack: big story + headline list · wide: full-width banner + row of 4
   * split: editorial lead + 2×2 cards · columns: lead in the middle with stories either side
   */
  hero: 'grid' | 'stack' | 'wide' | 'split' | 'columns';
  /** soft: rounded shadowed panels · flat: outlined · sharp: square, open newspaper layout · elevated: extra rounded */
  cards: 'soft' | 'flat' | 'sharp' | 'elevated';
  /** Section heading style. */
  heads: 'bar' | 'underline' | 'tab' | 'rule';
  footer: 'dark' | 'brand' | 'light';
  /** mark: letter badge + name · text: name only · boxed: name in a coloured box */
  logo: 'mark' | 'text' | 'boxed';
  /** feature: big section blocks beside the sidebar · compact: all sections as a grid of small blocks */
  sections?: 'feature' | 'compact';
  /** false = every section label uses the brand colour instead of its own category colour. */
  categoryColors?: boolean;
}

export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
}
