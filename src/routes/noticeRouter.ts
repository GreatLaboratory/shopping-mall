import { Router } from 'express';

import { addNotice, modifyNotice, deleteNotice, forMarket, forProduct, forAdmin } from '../controllers/noticeController';

class NoticeRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 공지사항 등록하기
        this.router.post('/', addNotice);
    
        // 공지사항 답변하기
        this.router.put('/', modifyNotice);

        // 공지사항 삭제하기
        this.router.delete('/:noticeId', deleteNotice);

        // 마켓관리 패널에서 공지사항 목록 조회하기
        this.router.get('/forMarket/:marketId', forMarket);
        
        // 상품 상세보기에서 공지사항 목록 조회하기
        this.router.get('/forProduct/:productId', forProduct);
        
        // 슈퍼 관리자 패널에서 공지사항 목록 조회하기
        this.router.get('/forAdmin', forAdmin);
    }
}

const noticeRouter = new NoticeRouter();
export default noticeRouter.router;
