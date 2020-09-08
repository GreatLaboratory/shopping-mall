import { Document, Schema, model } from 'mongoose';
const { Types: { ObjectId } } = Schema;

export interface IResponseCart {
    cart?: CartDocument;
    cartId?: string;
    marketId?: string;
    productId?: string;
    exchangeId?: string;
    refundId?: string;
    color?: string;
    size?: string;
    stockNum?: number;
    mainImage?: string;
    marketName?: string;
    productName?: string;
    firstCategoryId?: string;
    cartProductList?: string[];
    orderPrice?: number;
    orderNum?: number;
    deliveryFirm?: string;
    deliveryId?: string;
    deliveryNumber?: string;
    isReviewed?: boolean;
    status?: string;
}

export interface IResponseCartforMarket {
    orderId?: string;
    cartId?: string;
    marketId?: string;
    productId?: string;
    productImage?: string;
    productName?: string;
    orderPrice?: number;
    orderNum?: number;
    orderUser?: string;
    receiveUser?: string;
    phone?: string;
    zipCode?: string;
    address?: string;
    addressDetail?: string;
    deliveryMsg?: string;
    orderDate?: string;
    marketName?: string;
    color?: string;
    size?: string;
    deliveryFirm?: string;
    deliveryNumber?: string;
    deliveryId?: string;
    exchangeId?: string;
    refundId?: string;
    status?: string;
    payType?: string;
    userEmail?: string;
    purchaseCompleteDate?: Date | null;
    deliveryStartDate?: Date | null;
    productPrice?: number;
    basicDiscountPrice?: number;
    couponDiscountPrice?: number;
    pointDiscountPrice?: number;
    deliveryFee?: number;
}

export type CartDocument = Document & {
    _id: string; // 고유 아이디
    userId: string;  // 사용자 아이디
    productId: string;  // 상품 아이디
    marketId: string;  // 마켓 아이디
    orderId: string; // 주문 아이디
    exchangeId: string; // 교환 아이디
    refundId: string; // 환불 아이디

    color: string;  // 색상
    size: string;  // 사이즈
    orderNum: number;  // 주문 수량
    orderPrice: number;  // 주문 가격

    isOrdered: boolean;  // 주문 완료 여부

    deliveryFirm: string;  // 배송사
    deliveryId: string;  // 배송사 아이디
    deliveryNumber: string; // 운송장 번호

    isReviewed: boolean; // 상품후기 생성 여부

    status: string; // 주문 상태
    deliveryStartDate: Date; // 배송 시작 날짜
    deliveryCompleteDate: Date; // 배송 완료 날짜
    purchaseCompleteDate: Date; // 구매 완료 날짜
    couponDiscountPrice: number; // 쿠폰 할인 금액
    pointDiscountPrice: number; // 적립금 할인 금액
    usedCouponIdList: string[]; // 사용된 쿠폰 아이디
    deliveryFee: number; // 배송비 => 0 or 3000원

    createdAt: Date;  // 생성 날짜
}

const cartSchema = new Schema({
    color: String,
    size: String,
    orderNum: Number,
    orderPrice: Number,
    deliveryFirm: String,
    deliveryId: String,
    deliveryNumber: String,
    isOrdered: {
        type: Boolean,
        default: false
    },
    isReviewed: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['배송준비 중', '배송 중', '배송 완료', '구매 확정', '교환 신청', '환불 신청', '교환 중', '교환 완료', '환불 완료', '주문 취소'],
    },
    deliveryStartDate: Date,
    deliveryCompleteDate: Date,
    purchaseCompleteDate: Date,
    couponDiscountPrice: Number,
    pointDiscountPrice: Number,
    deliveryFee: {
        type: Number,
        enum: [0, 3000]
    },
    usedCouponIdList: [{
        type: ObjectId,
        ref: 'Coupon'
    }],
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
    orderId: {
        type: ObjectId,
        ref: 'Order'
    },
    exchangeId: {
        type: ObjectId,
        ref: 'Exchange'
    },
    refundId: {
        type: ObjectId,
        ref: 'Refund'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Cart = model<CartDocument>('Cart', cartSchema);
