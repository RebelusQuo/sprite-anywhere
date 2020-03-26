import React, { useState, useEffect, useRef } from 'react';

import { detect } from './game_detection';

export default function App(props) {
    const [file, setFile] = useState(null);

    return !file
        ? <Upload onUpload={setFile}/>
        : <Canvas file={file}/>;
}

function Upload(props) {
    const { onUpload } = props;
    const file = useRef(null);

    const readFile = () => file.current && onUpload(file.current.files[0]);

    return <input type="file" ref={file} onChange={readFile} />
}

function Canvas(props) {
    const { file } = props;
    const canvas = useRef(null);

    useEffect(
        () => { file && canvas.current && import_from_sm_rom(file, canvas.current); },
        [file, canvas.current]
    );

    return <canvas ref={canvas} style={{ padding: '16px', backgroundColor: '#666'}}/>;
}

async function import_from_sm_rom(file, canvas) {
    const [, sprite] = await detect(file);
    const image = await sprite.master_png_image();

    const { width, height } = image;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
}
