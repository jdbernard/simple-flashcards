deploy:
	-rm -r dist
	mkdir dist
	cp flashcards.* dist
	git describe --always --tags | xargs --replace=INSERTED -- sed -i -e 's/%VERSION%/INSERTED/' dist/*
	aws s3 sync dist s3://flashcards.jdbernard.com
	rm -r dist
