/**
 * Creates a URL-friendly slug from a page name
 * @param pageName - The display name of the page (e.g., "Student Dashboard")
 * @returns URL-friendly string (e.g., "/student-dashboard")
 * 
 * @example
 * createPageUrl("Student Dashboard") // "/student-dashboard"
 * createPageUrl("Tutor Profile")     // "/tutor-profile"
 */
export function createPageUrl(pageName: string): string {
    if (!pageName || typeof pageName !== 'string') {
        return '/';
    }
    
    return '/' + pageName
        .toLowerCase()                    // Convert to lowercase
        .replace(/ /g, '-')               // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '');      // Remove special characters
}
