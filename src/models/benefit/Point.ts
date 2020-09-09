import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;
export type PointDocument = Document & {
    _id: string;  // 고유 아이디
    userId: string;  // 사용자 아이디
    
    useDate: Date;  // 사용 날짜
    usingPoint: number;  // 사용 포인트

    takeDate: Date;  // 획득 날짜
    takingPoint: number;  // 획득 포인트

    orderId: string;  // 주문 아이디
    reviewId: string;  // 후기 아이디
    createdAt: Date;  // 정렬을 위한 데이터 생성 날짜
}

const pointSchema = new Schema({
    userId: {
        type: ObjectId,
        ref: 'User'
    },
    reviewId: {
        type: ObjectId,
        ref: 'Review'
    },
    useDate: Date,
    usingPoint: Number,
    takeDate: Date,
    takingPoint: Number,
    orderId: {
        type: ObjectId,
        ref: 'Order'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Point = model<PointDocument>('Point', pointSchema);
