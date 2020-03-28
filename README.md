`docx-images` can extract images from a docx file, and crop them as necessary.

I.e. if a docx file embeds `image1.jpg` that is 100x100 pixels, but the document crops this image to 50x50 pixels, then `docx-images` will extract both the original image and a cropped version.

# Installation

`npm install -g docx-images`

# Usage

To see the list of available commands, run `docx-images`:

`docx-images`

```
Usage is docx-images command ...args
  Where command is one of ["extract", "list"]
  And ...args is zero or more arguments for that command
```

To view help for a command, run:

`docx-images COMMAND_NAME help`

## `list`

Lists the images found in a docx file:

```
Usage is: docx-images list [options...]
  --docx: {string} The path to the docx file.
  --documentXml: {string} The path to an already-extracted document.xml.rels file.
  --documentXmlRels: {string} The path to an already-extracted document.xml file.
```

Sample output:

`docx-images --docx D:/sample.docx`

```
Loading docx from D:/sample.docx

406 imageRels (image lookups - map an id to a target):
rId117 media/image61.jpeg
rId299 media/image164.jpeg
rId671 media/image358.jpeg
...

411 images (the order the images appear in the document):
embed= rId8 count= 1 target= media/image1.jpeg srcRect= { l: '', r: '', t: '', b: '' }
embed= rId9 count= 1 target= media/image2.jpeg srcRect= { l: '', r: '', t: '', b: '' } extent= { cx: '1396800', cy: '2664000' }
embed= rId16 count= 1 target= media/image3.jpeg srcRect= { l: '3006', r: '2248', t: '26301', b: '2472' }
embed= rId22 count= 1 target= media/image4.jpeg srcRect= { l: '', r: '', t: '19615', b: '5124' }
embed= rId23 count= 1 target= media/image5.jpeg srcRect= { l: '6529', r: '', t: '17028', b: '10010' }
embed= rId24 count= 1 target= media/image6.jpeg srcRect= { l: '', r: '', t: '12526', b: '8962' }
embed= rId25 count= 1 target= media/image7.jpeg srcRect= { l: '', r: '', t: '7139', b: '' } extent= { cx: '3600000', cy: '2494800' }
embed= rId26 count= 1 target= media/image8.jpeg srcRect= { l: '', r: '', t: '', b: '13243' }
...
```

The `srcRect` describes how the image is cropped. See comments in [src/docx/document.xml.js](src/docx/document.xml.js)
and the `getCropRect()` function for more information.

## `extract`

```
docx-images extract help
Usage is: docx-images extract [options...]
  --docx: {string} The path to the docx file.
  --output-dir: {string} Output folder for the extracted file(s). [Default "."]
  --image-prefix: {string} A prefix to use for the extracted image name(s). [Default ""]
```

Sample output:

`docx-images extract --docx D:/sample.docx --output-dir D:/test-folder --image-prefix MY_PREFIX_`

```
...
rId608 word/media/image316.jpeg D:\test-folder\word\media\MY_PREFIX_image316.jpeg image was not cropped
rId697 word/media/image384.jpeg D:\test-folder\word\media\MY_PREFIX_image384.jpeg image was not cropped
rId696 word/media/image383.jpeg D:\test-folder\word\media\MY_PREFIX_image383.jpeg image was not cropped
rId147 word/media/image79.jpeg image was cropped to:
  [0] D:\test-folder\word\media\MY_PREFIX_image79.crop.1.jpeg,
  old-size: {"left":0,"top":0,"width":997,"height":744},
  new-size: {"left":0,"top":112.17287999999999,"width":997,"height":631.82712}
...
```

# Development

## Linting

`npm run lint` or `npm run lint:watch`

## Testing

`npm run test` or `npm run test:watch`

# Notes

- This project uses xpath 0.0.24 because of this issue https://github.com/goto100/xpath/issues/78.
