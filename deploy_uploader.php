<?php $t='__TOKEN__';
if(!isset($_POST['t'])||$_POST['t']!==$t){header('HTTP/1.1 403 Forbidden');die('no');}
$d=ltrim(str_replace('\\','/',$_POST['d']),'/');
if($d===''||strpos($d,'..')!==false){die('no');}
$p=__DIR__.'/'.$d;@mkdir(dirname($p),0755,true);
echo (@move_uploaded_file($_FILES['f']['tmp_name'],$p)?'OK ':'FALLO ').(@file_exists($p)?filesize($p):-1);
