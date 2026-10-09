import {test} from 'node:test';import assert from 'node:assert/strict';
import * as placement from '../src/render/pet-placement.mjs';
test('manual pet rotation replaces the detector tilt and can turn left or right',()=>{
 assert.equal(typeof placement.petPlacement,'function');
 const s={focusX:.5,focusY:.4,radius:.2,petFace:{angle:.35,dx:0,dy:.12},petRotation:0};
 assert.equal(placement.petPlacement(s).angle,0);
 assert.equal(placement.petPlacement({...s,petRotation:-90}).angle,-Math.PI/2);
 assert.equal(placement.petPlacement({...s,petRotation:90}).angle,Math.PI/2);
});
test('pet position and size can change independently of the face deformation',()=>{
 const s={focusX:.5,focusY:.4,radius:.2,petX:20,petY:-10,petScale:1.5};
 const p=placement.petPlacement(s);assert.equal(p.x,224);assert.ok(Math.abs(p.y-96)<1e-8);assert.ok(Math.abs(p.radius-96)<1e-8);
 assert.equal(s.focusX,.5);assert.equal(s.radius,.2);
});
