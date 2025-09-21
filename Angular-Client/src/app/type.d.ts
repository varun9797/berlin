type UserResgistration = {
    username: string;
    email: string;
    password: string;
}

type UserLogin = {
    username: string;
    password: string;
}

type SendMessageObj = {
    senderId: string;
    reciverId: string;
    message: string;
    conversationId?: string; // For group messages
    conversationType?: 'one-to-one' | 'group';
    ping?: boolean;
}

type GroupMessageObj = {
    conversationId: string;
    senderId: string;
    message: string;
    messageType?: 'text' | 'image' | 'file' | 'system';
}

type ReceiveMessageObj = {
    sender: string;
    content: string;
    senderId: string;
    conversationId?: string;
    groupName?: string;
    messageId?: string;
    timestamp?: string | Date;
}

type UserObject = {
    newMessageCount?: number;
    username: string;
    userId: string;
    isOnline?: boolean;
    email?: string;
    avatar?: string;
}

type conversationApiResponseType = {
    data: ConversationObject[];
    pagination: MessagePagination;
}

type ConversationObject = {

    _id: string;
    type: 'one-to-one' | 'group';
    name?: string; // For group chats
    description?: string;
    avatar?: string;
    participants: ParticipantObject[];
    lastMessage?: {
        content: string;
        senderId: string;
        timestamp: Date;
    };
    unreadCount?: number;
    isOnline?: boolean; // For one-to-one chats
    createdAt: Date;
    updatedAt: Date;
}

type ParticipantObject = {
    _id: string;
    username: string;
    email: string;
    role?: 'admin' | 'member';
    joinedAt?: Date;
    isActive?: boolean;
}

type MessageObject = {
    _id: string;
    conversationId: string;
    senderId: string;
    content: string;
    messageType: 'text' | 'image' | 'file' | 'system';
    senderDetails?: {
        username: string;
    };
    timestamp?: string | Date;
    createdAt: Date;
}

type MessagePagination = {
    page: number;
    limit: number;
}

type TypingIndicator = {
    conversationId: string;
    userId: string;
    username: string;
    isTyping: boolean;
    conversationType: 'one-to-one' | 'group';
}

type CreateGroupRequest = {
    name: string;
    description?: string;
    participantIds: string[];
    settings?: {
        allowMembersToAddOthers: boolean;
        onlyAdminsCanSendMessages: boolean;
    };
}