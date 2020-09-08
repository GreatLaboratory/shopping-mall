import { Document, Schema, model } from 'mongoose';
import { IResponseCart } from './Cart';
const { Types: { ObjectId } } = Schema;

export interface IResponseOrder {
    orderId: string;
    orderDate: Date;
    cart: IResponseCart[];
}

export type OrderDocument = Document & {
    _id: string;  // 고유 아이디
    userId: string;  // 주문 고객 아이디
    cartIdList: string[];  // 주문 상품 아이디 리스트

    email: string;  // 수취인 이메일
    name: string;  // 수취인 이름
    phone: string;  // 수취인 핸드폰 번호

    zipCode: string;  // 우편 번호
    address: string;  // 주소
    addressDetail: string;  // 상세 주소

    deliveryMsg: string;  // 배송 시 요청사항
    totalPrice: number;  // 총 가격
    createdAt: Date;  // 주문 날짜

    payType: string;
}

const OrderSchema = new Schema({
    email: String,
    name: String,
    phone: String,
    zipCode: String,
    address: String,
    addressDetail: String,
    deliveryMsg: String,
    totalPrice: Number,
    createdAt: Date,
    userId: {
        type: ObjectId,
        ref: 'User'
    },
    cartIdList: [{
        type: ObjectId,
        ref: 'Cart'
    }],
    payType: String
});

export const Order = model<OrderDocument>('Order', OrderSchema);
