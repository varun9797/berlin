export const ShcemaConstants = {
    USER_SCHEMA: 'User',
    CONVERSATION_SCHEMA: 'Conversation',
    MESSAGE_SCHEMA: 'Message',
    WORD_GAME_SCHEMA: 'WordGame'
}

export const JWT_CONSTANTS = {
    AUTHORIZATION: 'Authorization',
    BEARER: 'Bearer',
    SECRET_KEY_TOKEN: process.env.JWT_SECRET || 'default',
}

export const HTTP_STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
}