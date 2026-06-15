/**
 * Creates a URL-friendly slug from a page name
 * @param pageName - The original page name (e.g., "Student Dashboard")
 * @returns URL-friendly string (e.g., "/student-dashboard")
 * 
 * @example
 * createPageUrl("Student Dashboard") // returns "/student-dashboard"
 * createPageUrl("My Profile") // returns "/my-profile"
 */
export function createPageUrl(pageName: string): string {
    return '/' + pageName.replace(/ /g, '-').toLowerCase();
}

/**
 * Reverse: Converts a URL slug back to a readable page name
 * @param slug - The URL slug (e.g., "/student-dashboard")
 * @returns Readable page name (e.g., "Student Dashboard")
 * 
 * @example
 * pageNameFromUrl("/student-dashboard") // returns "Student Dashboard"
 */
export function pageNameFromUrl(slug: string): string {
    return slug.replace(/^\//, '').replace(/-/g, ' ');
}

/**
 * Creates a URL for subject detail pages
 * @param subjectCode - Subject code (e.g., "math")
 * @returns URL string (e.g., "/subjects/math")
 */
export function createSubjectUrl(subjectCode: string): string {
    return `/subjects/${subjectCode}`;
}

/**
 * Creates a URL for resource detail pages
 * @param resourceId - Resource UUID or slug
 * @returns URL string (e.g., "/resources/{id}")
 */
export function createResourceUrl(resourceId: string): string {
    return `/resources/${resourceId}`;
}
