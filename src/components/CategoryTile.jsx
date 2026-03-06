export default function CategoryTile({ category, onClick }) {
    const Icon = category.icon;
    return (
        <div onClick={onClick} className={`p-6 rounded-2xl cursor-pointer border hover:shadow-md transition flex flex-col items-start gap-3 ${category.color}`}>
            <div className="p-3 bg-white/50 rounded-xl">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="font-bold text-lg">{category.title}</h3>
                <p className="text-sm opacity-80">Explore top songs</p>
            </div>
        </div>
    );
}
