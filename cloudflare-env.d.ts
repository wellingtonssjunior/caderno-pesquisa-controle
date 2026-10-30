declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    RESEARCH_USERNAME?: string;
    RESEARCH_PASSWORD_HASH?: string;
    BUCKET?: R2Bucket;
  }
}
