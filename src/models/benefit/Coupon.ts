import { Document, Schema, model } from 'mongoose';
import { UserCouponDocument } from './UserCoupon';
const { Types : { ObjectId } } = Schema;

export type CouponDocument = Document & {
    _id: string;  // 고유 아이디
    name: string;  // 쿠폰 이름
    description: string;  // 쿠폰 내용
    category: string;  // 쿠폰 구분

    startDate: Date;  // 사용가능 시작날짜
    endDate: Date;  // 사용가능 끝날짜

    benefitCategory: string;  // 혜택 구분
    benefit: number;  // 혜택 내용
    maxBenefit: number;  // 최대 할인 금액
    count: number;  // 소비자에게 쿠폰을 지급한 수량
    
    productIdList: string[];  // 사용가능 상품 아이디 리스트
    userCouponList: UserCouponDocument[];  // 지급받은 사용자 사용 내역 아이디 리스트

    marketId: string;  // 지급받은 마켓 아이디
    maxCountForMarket: number;  // 지급받은 마켓이 소비자에게 지급할 수 있는 발급수량 한도

    basePrice: number;  // 사용 가능 기준 금액

    createdAt: Date;  // 생성날짜
}

const couponSchema = new Schema({
    name: String,
    description: String,
    category: String,
    startDate: Date,
    endDate: Date,
    benefitCategory: {
        type: String,
        enum: ['할인금액', '할인율']
    },
    benefit: Number,
    maxBenefit: Number,
    count: {
        type: Number,
        default: 0
    },
    productIdList: [{
        type: ObjectId,
        ref: 'Product'
    }],
    userCouponList: [{
        type: ObjectId,
        ref: 'UserCoupon'
    }],
    marketId: {
        type: ObjectId,
        ref: 'Market'
    },
    maxCountForMarket: Number,
    basePrice: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Coupon = model<CouponDocument>('Coupon', couponSchema);
