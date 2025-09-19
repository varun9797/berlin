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
    ping?: boolean;
}

type ReceiveMessageObj = {
    sender: string;
    content: string;
    senderId: string;
}

type UserObject = {
    newMessageCount?: number;
    username: string;
    userId: string;
    isOnline?: boolean;
}

type UserObject = {
    username: string;
    id: string;
}

type MessagePagination = {
    page: number;
    limit: number;
}