(function () {
    var SK = 'jiatang_projects_v1';
    var grid = document.getElementById('grid');
    if (!grid) return;

    function esc(s) {
        if (s == null) return '';
        return String(s)
            .replace(/\&/g, '&amp;')
            .replace(/\</g, '&lt;')
            .replace(/\>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/\'/g, '&#39;');
    }

    function pad2(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function cardHTML(p, idx) {
        if (!p || !p.id) return '';
        var t = p.thumb || p.cover || p.thumbnail || '';
        var name = esc(p.name || '未命名项目');
        var sub = esc(p.subtitle || p.description || '');
        var type = p.type || '';
        var year = p.year || '';
        var index = pad2(idx + 1);

        var thumb;
        if (t) {
            thumb = '<div class="project-thumb"><img src="' + esc(t) + '" alt="' + name + '" loading="lazy" onerror="this.parentElement.classList.add(\'thumb-placeholder\')"><span class="thumb-fallback">' + index + '</span></div>';
        } else {
            thumb = '<div class="project-thumb thumb-placeholder"><span class="thumb-fallback">' + index + '</span></div>';
        }

        return '<a href="project.html?id=' + encodeURIComponent(p.id) + '" class="project-link fan-card">' +
            thumb +
            '<div class="project-info">' +
                '<div class="project-title-block">' +
                    '<span class="project-name">' + name + '</span>' +
                    '<span class="project-subtitle">' + sub + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="project-meta">' +
                '<div class="meta-left">' +
                    (type ? '<span class="project-type type-desktop">' + type + '</span>' : '') +
                '</div>' +
                '<div class="meta-right">' +
                    (year ? '<span class="project-year mono">' + year + '</span>' : '') +
                    '<span class="project-arrow">↗</span>' +
                '</div>' +
            '</div>' +
        '</a>';
    }

    function render(list) {
        if (!Array.isArray(list) || !list.length) {
            grid.innerHTML = '<div class="w-empty"><h2>暂无作品</h2><p>作品正在准备中...</p></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < list.length; i++) {
            h += cardHTML(list[i], i);
        }
        grid.innerHTML = h;
    }

    function load(cb) {
        fetch('/projects?_t=' + Date.now(), { cache: 'no-store' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                var list = d.projects || d;
                if (Array.isArray(list) && list.length) { cb(list); return; }
                throw new Error('empty');
            })
            .catch(function() {
                try {
                    var c = localStorage.getItem(SK);
                    if (c) {
                        var d = JSON.parse(c);
                        var list = d.projects || d;
                        if (Array.isArray(list) && list.length) { cb(list); return; }
                    }
                } catch(e) {}
                fetch('projects.json', { cache: 'no-store' })
                    .then(function(r) { return r.json(); })
                    .then(function(d) {
                        var list = d.projects || d;
                        if (Array.isArray(list) && list.length) { cb(list); return; }
                        throw new Error('empty');
                    })
                    .catch(function() {
                        grid.innerHTML = '<div class="w-empty"><h2>加载失败</h2><p>请稍后刷新重试</p></div>';
                    });
            });
    }

    load(render);
})();
