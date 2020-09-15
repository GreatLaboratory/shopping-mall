import { Router } from 'express';

import { bargainUploader } from '../routes/middleWares/uploader';
import { addBargain, getProductList, deleteBargain, getBargain, getServiceBargain, modifyBargain, getBargainList } from '../controllers/bargainController';

class BargainRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 기획전 등록하기
        this.router.post('/', bargainUploader.single('bannerImage'), addBargain);
        
        // 기획전 제품 추가 가능 목록 카테고리별 조회하기
        this.router.get('/productList/:page', getProductList);
        
        // 기획전 수정하기
        this.router.put('/', bargainUploader.single('bannerImage'), modifyBargain);
        
        // 기획전 삭제하기
        this.router.delete('/:bargainId', deleteBargain);
        
        // 특정 기획전 조회하기
        this.router.get('/forAdmin/:bargainId', getBargain);

        // 현재 서비스에 올라가는 기획전 조회하기
        this.router.get('/:page', getServiceBargain);
        
        // 현재 서비스에 올라가는 기획전 조회하기
        this.router.get('/list/:page', getBargainList);
    }
}

const bargainRouter = new BargainRouter();
export default bargainRouter.router;
