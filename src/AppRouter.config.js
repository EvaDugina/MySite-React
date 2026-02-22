import Neprikosnovenna from "./projects/Neprikosnovenna/Neprikosnovenna"
import page01 from "./projects/Neprikosnovenna/01.jsx"

export const routes = [
    {
        path: "/neprikosnovenna",
        title: "Неприкосновенна",
        icon: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.jpg",
        description: "Проект 'Неприкосновенна' - художественная инсталляция",
        keywords: "искусство, инсталляция, неприкосновенна",
        ogImage: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.png",
        component: Neprikosnovenna,
    },
    {
        path: "/neprikosnovenna/and-i-am-the-only-one-who-knows-that-you-look-better-with-blood",
        title: "И только я один знаю что с кровью ты выглядишь лучше",
        icon: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.jpg",
        description: "Проект 'Неприкосновенна' - художественная инсталляция",
        keywords: "неприкосновенная",
        ogImage: "/icons/ОПЛОДОТВОРЕНИЕ_LOD2.png",
        component: page01,
    },
]
