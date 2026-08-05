import urllib.request
import urllib.parse
import os

out_dir = r'D:\trae项目\个人网页\assets\images\projects'
os.makedirs(out_dir, exist_ok=True)

prompts = [
    ('minimalist UI design dashboard interface, clean white and light blue color scheme, geometric shapes, modern flat design aesthetic, professional portfolio cover', 'project-01.jpg'),
    ('mobile app UI design concept, soft gradient background from light blue to white, rounded cards, minimalist interface design', 'project-02.jpg'),
    ('design tool plugin interface, dark theme with neon green accent, creative coding aesthetic, geometry and vectors', 'project-03.jpg'),
    ('brand identity design system, color palette swatches, typography hierarchy, minimal grid layout, soft blue and gray tones', 'project-04.jpg'),
]

base = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image'

for prompt, name in prompts:
    url = f'{base}?prompt={urllib.parse.quote(prompt)}&image_size=landscape_16_9'
    dest = os.path.join(out_dir, name)
    try:
        urllib.request.urlretrieve(url, dest)
        print(f'Downloaded: {name}')
    except Exception as e:
        print(f'Failed: {name} - {e}')

print('Done.')
