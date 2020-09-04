import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export interface IResponseAsk {
    ask: AskDocument;
    productImage?: string;
    marketName?: string;
    productName?: string;
    userName?: string;
}

export type AskDocument = Document & {
    _id: string;  // 고유 아이디
    productId: string;  // 문의할 상품 아이디
    userId: string; // 문의한 소비자 아이디
    marketId: string; // 답변할 마켓 아이디

    title: string; // 제목
    content: string; // 문의 내용
    isPublic: boolean; // 공개 여부
    createdAt: Date;  // 문의 등록날짜

    image: string;  // 이미지

    isReplied: boolean;  // 답변 여부
    reply: string;  // 답변
}

const askSchema = new Schema({
    productId: {
        type: ObjectId,
        ref: 'Product'
    },
    userId: {
        type: ObjectId,
        ref: 'User'
    },
    marketId: {
        type: ObjectId,
        ref: 'Market'
    },
    title: String,
    content: String,
    isPublic: Boolean,
    createdAt: Date,
    image: String,
    isReplied: {
        type: Boolean,
        default: false
    },
    reply: String
});

export const Ask = model<AskDocument>('Ask', askSchema);
