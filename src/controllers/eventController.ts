import { Request, Response, NextFunction } from 'express';

import { Event, EventDocument } from '../models/info/event/Event';
import { Comment, CommentDocument } from '../models/info/event/Comment';
import { UserDocument, User } from '../models/user/User';

// POST -> 이벤트 등록하기
export const addEvent = async (req: Request, res: Response, next: NextFunction) => {
    const { title, content, startDate, endDate, isButton, buttonText, buttonUrl } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const bannerImageUrl = files.bannerImage === undefined ? '' : files.bannerImage[0].location;
    const detailImageUrl = files.detailImage === undefined ? '' : files.detailImage[0].location;
    try {
        const event: EventDocument | null = await Event.findOne({ title, content, startDate, endDate });
        if (event) {
            res.status(400).json({ message: '해당하는 제목과 내용의 이벤트가 이미 존재합니다.'});
        } else {
            await Event.create({ 
                title, 
                content, 
                startDate, 
                endDate, 
                isButton, 
                buttonText, 
                buttonUrl,
                bannerImage: bannerImageUrl, 
                detailImage: detailImageUrl 
            });
            res.status(201).json({ message: '성공적으로 이벤트가 등록되었습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
// PUT -> 이벤트 수정하기
export const modifyEvent = async (req: Request, res: Response, next: NextFunction) => {
    const { eventId, title, content, startDate, endDate, isButton, buttonText, buttonUrl } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    try {
        const event: EventDocument | null = await Event.findById(eventId);
        if (event) {
            const bannerImageUrl = files.bannerImage === undefined ? event.bannerImage : files.bannerImage[0].location;
            const detailImageUrl = files.detailImage === undefined ? event.detailImage : files.detailImage[0].location;
            event.title = title;
            event.content = content;
            event.startDate = startDate;
            event.endDate = endDate;
            event.isButton = isButton;
            event.buttonText = buttonText;
            event.buttonUrl = buttonUrl;
            event.bannerImage = bannerImageUrl;
            event.detailImage = detailImageUrl;
            await event.save();
            res.status(201).json({ message: '성공적으로 이벤트가 수정되었습니다.' });
        } else {
            res.status(404).json({ message: '해당 아이디의 이벤트가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 이벤트 목록 조회하기
export const getEventList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventList: EventDocument[] = await Event.find().select('title content startDate endDate bannerImage');
        res.status(200).json(eventList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 이벤트 상세내용 조회하기
export const getEventDetail = async (req: Request, res: Response, next: NextFunction) => {
    const { eventId } = req.params;
    try {
        const event: EventDocument | null = await Event.findById(eventId).populate('commentIdList');
        if (event) res.status(200).json(event);
        else res.status(404).json({ message: '해당 아이디의 이벤트가 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// DELETE -> 이벤트 삭제하기
export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
    const { eventId } = req.params;
    try {
        const deletedEvent: EventDocument | null = await Event.findByIdAndDelete(eventId).select('commentIdList');
        if (deletedEvent) {
            deletedEvent.commentIdList.map(async (commentId: string) => {
                await Comment.findByIdAndDelete(commentId);
            });
            res.status(201).json({ message: '성공적으로 이벤트가 삭제되었습니다.' });
        } else {
            res.status(404).json({ message: '해당 아이디의 이벤트가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 이벤트 댓글달기
export const addComment = async (req: Request, res: Response, next: NextFunction) => {
    const { eventId, comment, createdAt } = req.body;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    try {
        const user: UserDocument | null = await User.findById(userId);
        if (user) {
            const createdComment: CommentDocument = await Comment.create({ eventId, userId, comment, userName: user.name, createdAt }); 
            const event: EventDocument | null = await Event.findById(eventId);
            if (event) {
                event.commentIdList.push(createdComment._id);
                event.save();
                res.status(201).json({ message: '댓글이 성공적으로 등록되었습니다.' });
            } else {
                res.status(404).json({ message: '해당 아이디의 이벤트가 존재하지 않습니다.' });
            }
        } else {
            res.status(404).json({ message: '해당 아이디의 사용자가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 이벤트 댓글 수정하기
export const modifyComment = async (req: Request, res: Response, next: NextFunction) => {
    const { commentId, comment, createdAt } = req.body;
    try {
        const updatedComment = await Comment.findByIdAndUpdate(commentId, { comment, createdAt });
        if (updatedComment) res.status(201).json({ message: '댓글이 성공적으로 수정되었습니다.' });
        else res.status(404).json({ message: '해당 아이디의 댓글이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// DELETE -> 이벤트 댓글 삭제하기
export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    const { commentId } = req.params;
    try {
        const deletedComment: CommentDocument | null = await Comment.findByIdAndDelete(commentId).select('eventId');
        if (deletedComment) {
            const selectedEvent: EventDocument | null = await Event.findById(deletedComment.eventId).select('commentIdList');
            if (selectedEvent) {
                const idx: number = selectedEvent.commentIdList.indexOf(commentId);
                selectedEvent.commentIdList.splice(idx, 1);
                selectedEvent.save();
                res.status(201).json({ message: '댓글이 성공적으로 삭제되었습니다.' });
            } else {
                res.status(404).json({ message: '해당 아이디의 이벤트가 존재하지 않습니다.' });
            }
        } else {
            res.status(404).json({ message: '해당 아이디의 댓글이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};
