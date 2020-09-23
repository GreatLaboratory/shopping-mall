import { Router } from 'express';

import { eventUploader } from '../routes/middleWares/uploader';
import { addEvent, modifyEvent, deleteComment, deleteEvent, addComment, getEventList, getEventDetail, modifyComment } from '../controllers/eventController';
import { verifyJwtToken } from './middleWares/authValidation';

class EventRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 이벤트 등록하기
        this.router.post('/', eventUploader.fields([{ name: 'bannerImage' }, { name: 'detailImage' }]), addEvent);
        
        // 이벤트 수정하기
        this.router.put('/', eventUploader.fields([{ name: 'bannerImage' }, { name: 'detailImage' }]), modifyEvent);

        // 이벤트 목록 조회하기
        this.router.get('/list', getEventList);
        
        // 이벤트 상세 조회하기
        this.router.get('/:eventId', getEventDetail);
        
        // 이벤트 삭제하기
        this.router.delete('/:eventId', deleteEvent);
        
        // 이벤트 댓글달기
        this.router.post('/comment', verifyJwtToken, addComment);
        
        // 이벤트 댓글 수정하기
        this.router.put('/comment', modifyComment);
        
        // 이벤트 댓글 삭제하기
        this.router.delete('/comment/:commentId', deleteComment);
    }
}

const eventRouter = new EventRouter();
export default eventRouter.router;
