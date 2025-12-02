import { users, documents } from '@prisma/client';

type DocumentVisibilityScope = 'public' | 'department' | 'private' | null | undefined;
type ConfidentialLevel = 'normal' | 'confidential' | 'secret' | 'top_secret' | null | undefined;

/**
 * Check if user can view a document based on visibility rules
 * Implements minimal RBAC for document access
 */
export async function canViewDocument(
  user: users,
  doc: documents & { visibility_scope?: string | null }
): Promise<boolean> {
  // Layer 1: Tenant check
  if (doc.tenant_id !== user.tenant_id) {
    return false;
  }

  // Layer 2: Admin bypass (check role field)
  // Note: In full RBAC, this would check permissions table
  const userRole = (user as any).role;
  if (userRole === 'Admin' || userRole === 'admin') {
    return true;
  }

  // Layer 3: Owner check
  if (doc.owner_id && doc.owner_id === user.id) {
    return true;
  }

  // Layer 3.5: Approver check - if user is assigned as approver for this document
  const { prisma } = require('../../config/prisma');
  const approval = await prisma.document_approvals.findFirst({
    where: {
      document_id: doc.id,
      approver_user_id: user.id
    }
  });
  
  if (approval) {
    return true; // Approver can view document
  }

  // Layer 3.6: CC check - if user's email is in CC list
  const ccEmail = await prisma.document_cc_emails.findFirst({
    where: {
      document_id: doc.id,
      email: user.email
    }
  });
  
  if (ccEmail) {
    return true; // CC recipient can view document
  }

  // Layer 4: Visibility scope
  const scope = (doc.visibility_scope as DocumentVisibilityScope) ?? 'public';
  
  if (scope === 'private') {
    // Only owner + admin (already checked above)
    return false;
  }

  if (scope === 'department') {
    // Check if user is in the same department
    const docDeptId = (doc as any).department_id;
    const userDeptId = user.department_id;
    
    // If document has no department, treat as private
    if (!docDeptId) {
      return false;
    }
    
    // If user has no department, deny access
    if (!userDeptId) {
      return false;
    }
    
    // Allow if same department
    return docDeptId === userDeptId;
  }

  // Layer 5: Confidential level (for public documents)
  if (scope === 'public') {
    const level = (doc.confidential_level as ConfidentialLevel) ?? 'normal';
    if (level === 'secret' || level === 'top_secret') {
      // Secret documents only for owner + admin (already checked above)
      return false;
    }
    return true;
  }

  // Default: deny access
  return false;
}

/**
 * Filter documents array based on user permissions
 */
export async function filterViewableDocuments(
  user: users,
  documents: (documents & { visibility_scope?: string | null })[]
): Promise<(documents & { visibility_scope?: string | null })[]> {
  const viewableDocuments = [];
  
  for (const doc of documents) {
    if (await canViewDocument(user, doc)) {
      viewableDocuments.push(doc);
    }
  }
  
  return viewableDocuments;
}
