export class User {
    constructor (u: string, p: string) {
        this.user = u;
        this.password = p;
    }

    user: string;
    password: string;
}