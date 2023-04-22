function escapeRegExp(string)
{
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

if (typeof String.prototype.replaceAll !== "function")
{
    String.prototype.replaceAll = function(find, replace)
    {
        return this.replace(new RegExp(escapeRegExp(find), 'g'), replace);
    }
}