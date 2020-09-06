import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;
export type NoticeDocument = Document & {
    _id: string;
    marketId: string;

    title: string;
    content: string;
}

const noticeSchema = new Schema({
    title: String,
    content: String,
    marketId: {
        type: ObjectId,
        ref: 'Market'
    }
});

export const Notice = model<NoticeDocument>('Notice', noticeSchema);
