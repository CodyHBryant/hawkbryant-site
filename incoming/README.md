# Photo inbox

Upload finished photographs to this folder. The photo pipeline will:

1. create a web-ready master in `images/`;
2. create responsive copies in `images/optimized/`;
3. add a hidden record to `data/photos.json`; and
4. remove the uploaded inbox copy after processing.

New photographs stay off the public Work page until their metadata is reviewed and
`featured` is changed to `true`.

Use JPEG, PNG, TIFF, or WebP files. RAW files should remain in the photo archive and
be exported before upload.
