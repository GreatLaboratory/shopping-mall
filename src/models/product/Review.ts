import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export interface IResponseReview {
    review: ReviewDocument;
    mainImage?: string;
    marketName?: string;
    marketImage?: string;
    productName?: string;
    userName?: string;
    cartId?: string;
    color: string;
    size: string;
    productImage?: string;
}

export type ReviewDocument = Document & {
    _id: string;
    userId: string;  // 후기를 쓴 사용자
    productId: string;  // 후기가 쓰여진 제품
    marketId: string;  // 후기가 쓰여진 제품의 마켓
    cartId: string; // 후기가 쓰여진 주문 정보

    content: string;  // 후기 내용
    rate: number;  // 평점
    height: string;  // 키
    weight: string;  // 몸무게
    footSize: string;  // 발 사이즈
    footWidth: string;  // 발 볼
    wearable: string;  // 착용감
    image: string;  // 이미지

    createdAt: Date;  // 후기작성날짜

    isReplied: boolean;  // 답변 여부
    reply: string;  // 답변
}

const ReviewSchema = new Schema({
    userId: {
        type: ObjectId,
        ref: 'User'
    },
    productId: {
        type: ObjectId,
        ref: 'Product'
    },
    marketId: {
        type: ObjectId,
        ref: 'Market'
    },
    cartId: {
        type: ObjectId,
        ref: 'Cart'
    },
    content: String,
    rate: Number,
    image: String,
    height: String,
    weight: String,
    footSize: String,
    footWidth: {
        type: String,
        enum: ['좁아요', '보통이에요', '넓어요', '']
    },
    wearable: {
        type: String,
        enum: ['작아요', '잘 맞아요', '커요']
    },
    createdAt: Date,
    isReplied: {
        type: Boolean,
        default: false
    },
    reply: String
});

export const Review = model<ReviewDocument>('Review', ReviewSchema);
