import Neprikosnovenna from "./pages/Neprikosnovenna";
import page01 from "./pages/01.jsx";

export const routes = [
    {
        path: "/neprikosnovenna",
        title: "Неприкосновенна",
        icon: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.jpg",
        description:
            "Web-инсталляция «Неприкосновенна» посвящена снятию оппозиции между руктоворным и сакральным, " +
            "сакральным и рукотворным, когда одно проявляется в другом как матрёшка — разрешишь ли ты мне этот парадокс? — " +
            "и не может существовать без другого.",
        keywords:
            "искусство, web-инсталляция, неприкосновенна, сакральное, рукотворное",
        ogImage: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.png",
        component: Neprikosnovenna,
    },
    {
        path: "/neprikosnovenna/and-i-am-the-only-one-who-knows-that-you-look-better-with-blood",
        title: "И только я один знаю что с кровью ты выглядишь лучше",
        icon: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.jpg",
        description:
            "Web-инсталляция «Неприкосновенна» посвящена снятию оппозиции между руктоворным и сакральным, " +
            "сакральным и рукотворным, когда одно проявляется в другом как матрёшка — разрешишь ли ты мне этот парадокс? — " +
            "и не может существовать без другого.",
        keywords:
            "искусство, web-инсталляция, неприкосновенна, сакральное, рукотворное",
        ogImage: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.png",
        component: page01,
    },
];
