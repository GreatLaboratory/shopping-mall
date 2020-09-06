import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export type CommentDocument = Document & {
    _id: string;  // 고유 아이디
    eventId: string;  // 댓글 남긴 이벤트 아이디
    userId: string; // 댓글 남긴 사용자의 아이디

    comment: string; // 댓글내용
    userName: string; // 댓글 쓴 유저이름
    createdAt: Date; // 댓글 쓴 날짜
}

const commentSchema = new Schema({
    comment: String,
    userName: String,
    createdAt: Date,
    eventId: {
        type: ObjectId,
        ref: 'Event'
    },
    userId: {
        type: ObjectId,
        ref: 'User'
    }
});

export const Comment = model<CommentDocument>('Comment', commentSchema);
