import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;
export type EventDocument = Document & {
    _id: string;  // 고유 아이디
    title: string;  // 제목
    content: string;  // 내용
    startDate: Date; // 이벤트 시작 날짜
    endDate: Date; // 이벤트 종료 날짜
    
    bannerImage: string;  // 배너 이미지
    detailImage: string;  // 상세 이미지

    isButton: boolean;  // 버튼 존재 여부
    buttonText: string; // 버튼에 들어갈 말
    buttonUrl: string; // 버튼 클릭 시 넘어가는 url

    commentIdList: string[];  // 댓글 목록
}

const eventSchema = new Schema({
    title: String,
    content: String,
    startDate: Date,
    endDate: Date,
    bannerImage: String,
    detailImage: String,
    isButton: Boolean,
    buttonText: String,
    buttonUrl: String,
    commentIdList: [
        {
            type: ObjectId,
            ref: 'Comment'
        }
    ]
});

export const Event = model<EventDocument>('Event', eventSchema);
