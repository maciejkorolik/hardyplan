import Firecrawl from "firecrawl";

// Initialize Firecrawl client
const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

/**
 * Scrape the blog category page to extract blog post URLs
 * @returns Array of blog post URLs (expects 2: current week + next week)
 */
export async function scrapeCategoryPage(): Promise<string[]> {
  try {
    const categoryUrl = process.env.BLOG_CATEGORY_URL!;

    console.log("Scraping category page:", categoryUrl);

    // Use the correct scrape() method with formats parameter
    const scrapeResult = await firecrawl.scrape(categoryUrl, {
      formats: ["links"],
    });

    console.log("Firecrawl response keys:", Object.keys(scrapeResult));

    // Firecrawl SDK returns data directly, not wrapped in {success, data}
    // Extract links from the response
    const links = scrapeResult.links || [];

    if (!links || links.length === 0) {
      console.warn("No links found in category page");
      return [];
    }

    console.log(`Found ${links.length} total links`);

    // Filter for blog post URLs with "plan-treningowy" in the path
    // Should find both:
    // - https://www.hardywyzszaforma.pl/post/plan-treningowy-na-tydzie%C5%84-29-07-03-08
    // - https://www.hardywyzszaforma.pl/post/plan-treningowy
    const blogPostUrls = links.filter((link) => {
      const url = typeof link === "string" ? link : link.url || "";
      return (
        url.includes("/post/plan-treningowy") && !url.includes("/categories/")
      );
    });

    // Convert to string array if needed
    const urlStrings = blogPostUrls.map((link) =>
      typeof link === "string" ? link : link.url || link
    );

    // Return the 2 most recent posts (they should be in order)
    const uniqueUrls = Array.from(new Set(urlStrings)).slice(0, 2);

    console.log(`Found ${uniqueUrls.length} blog post URLs:`, uniqueUrls);

    return uniqueUrls;
  } catch (error) {
    console.error("Error scraping category page:", error);
    throw error;
  }
}

/**
 * Scrape a blog post to extract markdown content
 * @param url - Blog post URL
 * @returns Markdown content and metadata
 */
export async function scrapeBlogPost(url: string): Promise<{
  markdown: string;
  url: string;
}> {
  try {
    console.log("Scraping blog post:", url);

    // Use the correct scrape() method
    const scrapeResult = await firecrawl.scrape(url, {
      formats: ["markdown"],
    });

    // Firecrawl SDK returns data directly
    const markdown = scrapeResult.markdown;

    if (!markdown) {
      throw new Error(`Failed to scrape blog post (no markdown): ${url}`);
    }

    console.log(
      `Successfully scraped blog post, markdown length: ${markdown.length}`
    );

    return {
      markdown,
      url,
    };
  } catch (error) {
    console.error("Error scraping blog post:", error);
    throw error;
  }
}

/**
 * Scrape all blog posts from the category page
 * @returns Array of scraped blog posts with markdown content
 */
export async function scrapeAllBlogPosts(): Promise<
  Array<{
    markdown: string;
    url: string;
  }>
> {
  try {
    // Get blog post URLs from category page
    const urls = await scrapeCategoryPage();

    if (urls.length === 0) {
      console.warn("No blog post URLs found on category page");
      return [];
    }

    // Scrape each blog post
    const posts = await Promise.all(urls.map((url) => scrapeBlogPost(url)));

    return posts;
  } catch (error) {
    console.error("Error scraping all blog posts:", error);
    throw error;
  }
}
