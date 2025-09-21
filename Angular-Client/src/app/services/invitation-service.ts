import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InvitationService {

  constructor(private http: HttpClient) { }

  // Create invitation link for group (admin only)
  createGroupInvitation(request: CreateInvitationRequest): Observable<{ data: InvitationObject; message: string }> {
    return this.http.post<{ data: InvitationObject; message: string }>(
      `${environment.apiUrl}/api/v1/invitation/create`,
      request,
      { withCredentials: true }
    );
  }

  // Get invitation details by token (public)
  getInvitationDetails(token: string): Observable<{ data: InvitationDetailsResponse }> {
    return this.http.get<{ data: InvitationDetailsResponse }>(
      `${environment.apiUrl}/v1/invitation/details/${token}`
    );
  }

  // Submit join request via invitation link
  submitJoinRequest(request: JoinRequestSubmission): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/api/v1/invitation/join-request`,
      request,
      { withCredentials: true }
    );
  }

  // Get pending join requests for a group (admin only)
  getGroupJoinRequests(conversationId: string): Observable<{ data: JoinRequestObject[] }> {
    return this.http.get<{ data: JoinRequestObject[] }>(
      `${environment.apiUrl}/api/v1/invitation/join-requests/${conversationId}`,
      { withCredentials: true }
    );
  }

  // Process join request (approve/reject) (admin only)
  processJoinRequest(requestId: string, action: 'approve' | 'reject'): Observable<{ data?: ConversationObject; message: string }> {
    return this.http.post<{ data?: ConversationObject; message: string }>(
      `${environment.apiUrl}/api/v1/invitation/process-request`,
      { requestId, action },
      { withCredentials: true }
    );
  }

  // Get group invitations (admin only)
  getGroupInvitations(conversationId: string): Observable<{ data: InvitationObject[] }> {
    return this.http.get<{ data: InvitationObject[] }>(
      `${environment.apiUrl}/api/v1/invitation/group/${conversationId}`,
      { withCredentials: true }
    );
  }

  // Revoke invitation (admin only)
  revokeInvitation(invitationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrl}/api/v1/invitation/${invitationId}`,
      { withCredentials: true }
    );
  }
}
