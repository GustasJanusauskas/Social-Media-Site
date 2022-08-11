export class Comment {
    content?: string;
    date?: string;
    author?: string;

    authorID?: number = 0;
    postID: number = 0;
    commentID?: number = 0;
}