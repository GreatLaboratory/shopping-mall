import { Schema, model, PassportLocalSchema, PassportLocalDocument } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';
const { Types : { ObjectId } } = Schema;

export type UserDocument = PassportLocalDocument & {
    _id: string;  // 고유 아이디
    snsId: string; // 카톡 profile 아이디
    email: string;  // 이메일
    name: string;  // 이름
    phone: string;  // 핸드폰 번호
    agreeTerms: boolean;  // 이용약관 동의 여부
    agreePrivateInfo: boolean;  // 개인정보 이용약관 동의 여부
    agreeMarketingInfo: boolean;  // 마케팅 정보 활용 동의 여부
    recentAdressIdList: string[];  // 최근 배송지 정보 리스트

    likeProductIdList: string[];  // 좋아요 누른 상품 리스트
    likeMarketIdList: string[];  // 좋아요 누른 마켓 리스트
    couponIdList: string[];  // 보유하고 있는 쿠폰 리스트

    totalPoint: number;  // 총 획득 포인트
    remainPoint: number;  // 잔여 보유 포인트
    usedPoint: number;  // 사용 포인트

    fcmToken: string; // FCM 토큰
}

const userSchema = new Schema({
    snsId: String,
    email: String,
    name: String,
    phone: String,
    agreeTerms: Boolean,
    agreePrivateInfo: Boolean,
    agreeMarketingInfo: Boolean,
    recentAdressIdList: [
        {
            type: ObjectId,
            ref: 'Address'
        }
    ],
    likeProductIdList: [
        {
            type: ObjectId,
            ref: 'Product'
        }
    ],
    likeMarketIdList: [
        {
            type: ObjectId,
            ref: 'Market'
        }
    ],
    couponIdList: [
        {
            type: ObjectId,
            ref: 'Coupon'
        }
    ],
    totalPoint: {
        type: Number,
        default: 0
    },
    remainPoint: {
        type: Number,
        default: 0
    },
    usedPoint: {
        type: Number,
        default: 0
    },
    fcmToken : String,
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
export const User = model<UserDocument>('User', userSchema as PassportLocalSchema);
