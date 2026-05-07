import React from "react";

const Vhozhdenie = React.lazy(() => import('./pages/00_01'));
const SotvorenieZhizni = React.lazy(() => import('./pages/01_01'));
const Neprikosnovenna = React.lazy(() => import('./pages/Neprikosnovenna'));
const AndIAmTheOnlyOne = React.lazy(() => import('./pages/./AndIAmTheOnlyOne'));

export const routes = [
    {
        path: "/01_01",
        title: "Сотворение жизни",
        icon: "/favicon.ico",
        description:
            "Миниатюра о том, как удивительно способно рукотворное оживать и становиться сакральным.",
        keywords:
            "искусство, web-инсталляция, неприкосновенна, сакральное, рукотворное",
        ogImage: "/images/ВЗГЛЯД.jpg",
        component: SotvorenieZhizni,
    },
    {
        path: "/",
        title: "Неприкосновенна — вхождение",
        icon: "/favicon.ico",
        description:
            "Web-инсталляция «Неприкосновенна» посвящена снятию оппозиции между руктоворным и сакральным, " +
            "сакральным и рукотворным, когда одно проявляется в другом как матрёшка — разрешишь ли ты мне этот парадокс? — " +
            "и не может существовать без другого.",
        keywords:
            "искусство, web-инсталляция, неприкосновенна, сакральное, рукотворное",
        ogImage: "/images/ВЗГЛЯД.jpg",
        component: Vhozhdenie,
    },
    {
        path: "/neprikosnovenna",
        title: "Неприкосновенна",
        icon: "/favicon.ico",
        description:
            "Web-инсталляция «Неприкосновенна» посвящена снятию оппозиции между руктоворным и сакральным, " +
            "сакральным и рукотворным, когда одно проявляется в другом как матрёшка — разрешишь ли ты мне этот парадокс? — " +
            "и не может существовать без другого.",
        keywords:
            "искусство, web-инсталляция, неприкосновенна, сакральное, рукотворное",
        ogImage: "/images/ВЗГЛЯД.jpg",
        component: Neprikosnovenna,
    },
    {
        path: "/neprikosnovenna/and-i-am-the-only-one-who-knows-that-you-look-better-with-blood",
        title: "И только я один знаю что с кровью ты выглядишь лучше",
        icon: "/favicon.ico",
        description:
            "Web-инсталляция «Неприкосновенна» посвящена снятию оппозиции между руктоворным и сакральным, " +
            "сакральным и рукотворным, когда одно проявляется в другом как матрёшка — разрешишь ли ты мне этот парадокс? — " +
            "и не может существовать без другого.",
        keywords:
            "искусство, web-инсталляция, неприкосновенна, сакральное, рукотворное",
        ogImage: "/images/ВЗГЛЯД.jpg",
        component: AndIAmTheOnlyOne,
    },
];
