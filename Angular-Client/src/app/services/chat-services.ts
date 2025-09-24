import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { TokenService } from './token-service';


@Injectable({
  providedIn: 'root'
})
export class ChatServices {

  private socket!: Socket;
  private _newMessageBehaviorSubject = new BehaviorSubject<ReceiveMessageObj | null>(null);
  private _groupMessageSubject = new Subject<GroupMessageObj>();
  private _conversationsSubject = new BehaviorSubject<ConversationObject[]>([]);
  private _typingSubject = new Subject<TypingIndicator>();
  private _onlineUsersSubject = new BehaviorSubject<UserObject[]>([]);
  private _gameEventSubject = new Subject<any>();

  readonly newMessageBehaviorSubject = this._newMessageBehaviorSubject.asObservable();
  readonly groupMessageSubject = this._groupMessageSubject.asObservable();
  readonly conversationsSubject = this._conversationsSubject.asObservable();
  readonly typingSubject = this._typingSubject.asObservable();
  readonly onlineUsersSubject = this._onlineUsersSubject.asObservable();
  readonly gameEventSubject = this._gameEventSubject.asObservable();

  constructor(private http: HttpClient, private tokenService: TokenService) {
  }

  connect(userId: string): void {
    this.socket = io(environment.socketUrl, {
      query: { userId }, auth: {
        token: this.tokenService.getToken()
      }
    });

    // Set up all socket listeners
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    // Private message listener
    this.socket.on('privateMessage', (data: ReceiveMessageObj) => {
      console.log('Message received from socket:', data);
      this._newMessageBehaviorSubject.next(data);
    });

    // Group message listener
    this.socket.on('groupMessage', (data: any) => {
      console.log('Group message received from backend:', data);

      // Transform backend message to GroupMessageObj format
      const groupMessage: GroupMessageObj = {
        conversationId: data.conversationId,
        senderId: data.senderId,
        message: data.message,
        messageType: data.messageType || 'text'
      };

      console.log('Transformed group message:', groupMessage);
      this._groupMessageSubject.next(groupMessage);
    });

    // Online users listener
    this.socket.on('online-users', (users: UserObject[]) => {
      console.log('Online users from socket:', users);
      this._onlineUsersSubject.next(users);
    });

    // Typing indicator listener
    this.socket.on('userTyping', (data: TypingIndicator) => {
      this._typingSubject.next(data);
    });

    // Game event listeners
    this.socket.on('gameEvent', (eventData: any) => {
      console.log('🎮 Received gameEvent from chat socket:', eventData);
      this._gameEventSubject.next(eventData);
    });

    this.socket.on('gameUpdate', (eventData: any) => {
      console.log('🎮 Received gameUpdate from chat socket:', eventData);
      this._gameEventSubject.next(eventData);
    });

    // Connection status listeners
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });
  }

  sendMessage(messageObj: SendMessageObj): void {
    this.socket.emit('privateMessage', messageObj);
  }

  sendGroupMessage(messageObj: GroupMessageObj): void {
    this.socket.emit('groupMessage', messageObj);
  }

  joinGroup(conversationId: string): void {
    this.socket.emit('joinGroup', { conversationId });
  }

  leaveGroup(conversationId: string): void {
    this.socket.emit('leaveGroup', { conversationId });
  }

  // Game room methods
  initializeGameEventListener(): void {
    // Game event listeners are already set up in the constructor
    // This method is called to ensure they're ready
  }

  joinGameRoom(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('joinGameRoom', { conversationId });
    }
  }

  leaveGameRoom(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('leaveGameRoom', { conversationId });
    }
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean, conversationType: 'one-to-one' | 'group'): void {
    this.socket.emit('typing', {
      conversationId,
      isTyping,
      conversationType
    });
  }

  registeruser(userObj: UserObject): void {
    this.socket.emit('register', userObj);
  }

  onMessage(): void {
    // This method is deprecated, listeners are now set up in setupSocketListeners
    console.warn('onMessage() is deprecated. Socket listeners are automatically set up on connect.');
  }

  // New conversation management methods
  getUserConversations(): Observable<conversationApiResponseType> {
    return this.http.get<conversationApiResponseType>(`${environment.apiUrl}/api/v1/chat/user-conversations`,
      { withCredentials: true }
    );
  }

  createGroupConversation(groupData: CreateGroupRequest): Observable<ConversationObject> {
    return this.http.post<ConversationObject>(`${environment.apiUrl}/api/v1/chat/create-group`,
      groupData,
      { withCredentials: true }
    );
  }

  addParticipantsToGroup(conversationId: string, participantIds: string[]): Observable<ConversationObject> {
    return this.http.post<ConversationObject>(`${environment.apiUrl}/api/v1/chat/add-participants`,
      { conversationId, participantIds },
      { withCredentials: true }
    );
  }

  removeParticipantFromGroup(conversationId: string, participantId: string): Observable<ConversationObject> {
    return this.http.post<ConversationObject>(`${environment.apiUrl}/api/v1/chat/remove-participant`,
      { conversationId, participantId },
      { withCredentials: true }
    );
  }

  updateGroupInfo(conversationId: string, updateData: { name?: string; description?: string }): Observable<ConversationObject> {
    return this.http.put<ConversationObject>(`${environment.apiUrl}/api/v1/chat/group/${conversationId}`,
      updateData,
      { withCredentials: true }
    );
  }

  deleteGroup(conversationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/api/v1/chat/group/${conversationId}`,
      { withCredentials: true }
    );
  }

  getConversationMessages(conversationId: string, pagination: MessagePagination): Observable<MessageObject[]> {
    return this.http.post<MessageObject[]>(`${environment.apiUrl}/api/v1/chat/conversation-messages`,
      { conversationId, paginationDetails: pagination },
      { withCredentials: true }
    );
  }

  getOfflineMessages(requestedUserIds: string[], messagePagination: MessagePagination): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/v1/chat/conversations`, { userIds: requestedUserIds, paginationDetails: messagePagination }
      , { withCredentials: true }
    );
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  getOnlineUsers(): Observable<UserObject[]> {
    return this.onlineUsersSubject;
  }

  // Helper methods for conversation management
  updateConversationsLocally(conversations: ConversationObject[]): void {
    this._conversationsSubject.next(conversations);
  }

  addConversationLocally(conversation: ConversationObject): void {
    const currentConversations = this._conversationsSubject.value;
    const updatedConversations = [conversation, ...currentConversations];
    this._conversationsSubject.next(updatedConversations);
  }

  removeConversationLocally(conversationId: string): void {
    const currentConversations = this._conversationsSubject.value;
    const updatedConversations = currentConversations.filter(conv => conv._id !== conversationId);
    this._conversationsSubject.next(updatedConversations);
  }

  updateConversationLastMessage(conversationId: string, message: ReceiveMessageObj | GroupMessageObj): void {
    const conversations = this._conversationsSubject.value;
    const conversationIndex = conversations.findIndex(conv => conv._id === conversationId);

    if (conversationIndex !== -1) {
      const updatedConversations = [...conversations];
      let messageContent: string;

      // Handle different message types
      if ('content' in message) {
        messageContent = message.content;
      } else if ('message' in message) {
        messageContent = (message as GroupMessageObj).message;
      } else {
        messageContent = 'New message';
      }

      updatedConversations[conversationIndex] = {
        ...updatedConversations[conversationIndex],
        lastMessage: {
          content: messageContent,
          senderId: message.senderId,
          timestamp: new Date()
        }
      };

      // Move conversation to top
      const [updatedConversation] = updatedConversations.splice(conversationIndex, 1);
      updatedConversations.unshift(updatedConversation);

      this._conversationsSubject.next(updatedConversations);
    }
  }

  markConversationAsRead(conversationId: string): void {
    const conversations = this._conversationsSubject.value;
    const conversationIndex = conversations.findIndex(conv => conv._id === conversationId);

    if (conversationIndex !== -1) {
      const updatedConversations = [...conversations];
      updatedConversations[conversationIndex] = {
        ...updatedConversations[conversationIndex],
        unreadCount: 0
      };
      this._conversationsSubject.next(updatedConversations);
    }
  }

}
