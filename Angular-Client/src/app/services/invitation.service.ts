import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class InvitationService {
    private apiUrl = `${environment.apiUrl}/v1/invitation`;

    constructor(private http: HttpClient) { }

    // Create group invitation
    createGroupInvitation(data: {
        conversationId: string;
        expirationHours?: number;
        maxUses?: number;
    }): Observable<any> {
        return this.http.post(`${this.apiUrl}/create`, data);
    }

    // Get invitation details (public endpoint)
    getInvitationDetails(token: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/details/${token}`);
    }

    // Join group using invitation token
    joinGroup(token: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/join`, { inviteToken: token });
    }

    // Get invitations for a conversation (admin only)
    getConversationInvitations(conversationId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/conversation/${conversationId}`);
    }

    // Get join requests for a conversation (admin only)
    getJoinRequests(conversationId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/join-requests/${conversationId}`);
    }

    // Approve join request (admin only)
    approveJoinRequest(requestId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/approve-request`, { requestId });
    }

    // Reject join request (admin only)
    rejectJoinRequest(requestId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/reject-request`, { requestId });
    }

    // Revoke invitation (admin only)
    revokeInvitation(invitationId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/revoke/${invitationId}`);
    }
}
