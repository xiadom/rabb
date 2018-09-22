

export class GlTexture {
  texture: any;
  texParameters: any[] = [];

  constructor(private gl, private image) {
    // Create a texture.
    this.texture = gl.createTexture();

    // use texture unit 0
    gl.activeTexture(gl.TEXTURE0 + 0);

    // bind to the TEXTURE_2D bind point of texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 255, 255]));

    // Now that the image has loaded make copy it to the texture.
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);

    // set mips parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  bindTexture() {
    const {gl} = this;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }
}
