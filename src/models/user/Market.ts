import { Schema, model, PassportLocalSchema, PassportLocalDocument } from 'mongoose';
const { Types : { ObjectId } } = Schema;
import passportLocalMongoose from 'passport-local-mongoose';

export interface IResponseBestMarket {
    _id: string;
    name: string;
    image: string;
    tags: string[];
    productImages?: string[];
}

export type MarketDocument = PassportLocalDocument & {
    _id: string;  // 고유 아이디
    modelId: string; // 마켓이 가장 최근에 저장한 모델 고유 아이디

    email: string;  // 이메일
    name: string;  // 마켓 이름
    phone: string;  // 핸드폰 번호
    owner: string;  // 사업자 이름
    url: string;  // 사이트 주소
    image: string;  // 마켓 대표 사진
    businessNum: number;  // 사업자 등록번호
    introduce: string;  // 마켓 소개
    root: string;  // 입점 신청 경로
    tags: string[];  // 해쉬태그 목록

    agreeTerms: boolean;  // 이용약관 동의 여부
    agreePrivateInfo: boolean;  // 개인정보 이용약관 동의 여부
    agreeMarketingInfo: boolean;  // 마케팅 정보 활용 동의 여부
    rejectReason: string;  // 입점 거부사유
    allowStatus: string;  // 입점 허가, 입점 거부, 입점 심사중

    business: string;  // 사업자 등록증 사본
    telemarket: string;  // 통신 판매업 신고증 사본
    bankbook: string;  // 본인 명의 통장 사본

    like: number;  // 좋아요 수

    sales: number;  // 판매량

    createdAt: Date;  // 입점 날짜
}

const marketSchema = new Schema({
    modelId: {
        type: ObjectId,
        ref: 'Model'
    },
    email: String,
    name: String,
    phone: String,
    owner: String,
    url: String,
    image: String,
    businessNum: String,
    introduce: String,
    tags: Array,
    agreeTerms: Boolean,
    agreePrivateInfo: Boolean,
    agreeMarketingInfo: Boolean,
    rejectReason: String,
    business: String,
    telemarket: String,
    bankbook: String,
    createdAt: Date,
    allowStatus: {
        type: String,
        enum: ['입점 허가', '입점 거부', '입점 심사중'],
    },
    root: {
        type: String,
        enum: ['페이스북', '인스타그램', '맨즈바이 측 제안 문자', '지인 소개', '맨즈바이 홈페이지', '기타'],
    },
    like: {
        type: Number,
        default: 0
    },
    sales: {
        type: Number,
        default: 0
    }
});

marketSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
export const Market = model<MarketDocument>('Market', marketSchema as PassportLocalSchema);
