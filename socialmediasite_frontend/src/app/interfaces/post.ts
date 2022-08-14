export class Post {
    title?: string;
    body?: string;
    date?: string;
    likes?: number[] = [];

    author?: string;
    authorID: number = 0;
    postID?: number = 0;

    public constructor(t:string,b:string,a:string,aID:number,pID:number) {
        this.title = t;
        this.body=b;

        this.author=a;
        this.authorID=aID;
        this.postID=pID;
    }
}