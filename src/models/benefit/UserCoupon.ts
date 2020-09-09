import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export type UserCouponDocument = Document & {
    _id: string;  // 고유 아이디
    userId: string;  // 사용자 아이디
    couponId: string;  // 쿠폰 아이디
    userName: string;  // 사용자 이름
    
    isUsed: boolean;  // 사용 여부
    useDate: Date;  // 사용 날짜
    orderId: string;  // 주문 아이디
    
    createdAt: Date;  // 지급 날짜
}

const userCouponSchema = new Schema({
    userId: {
        type: ObjectId,
        ref: 'User'
    },
    couponId: {
        type: ObjectId,
        ref: 'Coupon'
    },
    orderId: {  
        type: ObjectId,
        ref: 'Order'
    },
    userName: String,
    isUsed: {
        type: Boolean,
        default: false
    },
    useDate: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const UserCoupon = model<UserCouponDocument>('UserCoupon', userCouponSchema);
